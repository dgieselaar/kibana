#!/usr/bin/env bash

# Find all kibana.jsonc packages (via git), count ts/js/json files per package
# and sum their allocated size on disk. Then report:
# - Top 10 packages by number of files
# - Top 10 packages by total allocated size
# - Aggregates by `type` and by `group` from kibana.jsonc
#
# Notes:
# - Only git-tracked files are considered.
# - "Size on disk" is computed using allocated blocks, trying BSD/macOS and GNU variants.
# - Requires: git, awk, stat, node (for parsing JSONC).

set -euo pipefail

main() {
  # Ensure we execute from the git repo root for consistent paths
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
  if [[ -z "${repo_root}" ]] || [[ ! -d "${repo_root}/.git" ]]; then
    echo "Error: not inside a git repository." >&2
    exit 1
  fi
  cd "${repo_root}"

  local temp_dir
  temp_dir=$(mktemp -d 2>/dev/null || mktemp -d -t kibana_pkg_stats)
  # Use default expansion to avoid set -u error when trap runs after locals are out of scope
  trap '[[ -n "${temp_dir:-}" ]] && rm -rf "${temp_dir}"' EXIT

  local meta_file sizes_file totals_file type_agg_file group_agg_file
  meta_file="${temp_dir}/meta.tsv"      # pkgDir \t type \t group
  sizes_file="${temp_dir}/sizes.tsv"    # path \t sizeBytes
  totals_file="${temp_dir}/totals.tsv"  # pkgDir \t fileCount \t sizeBytes
  type_agg_file="${temp_dir}/by_type.tsv"   # type \t fileCount \t sizeBytes \t pkgCount
  group_agg_file="${temp_dir}/by_group.tsv" # group \t fileCount \t sizeBytes \t pkgCount

  # Accept optional globs from CLI to restrict search space
  local -a globs=( "$@" )

  # Create meta mapping: package directory -> (type, group)
  if ((${#globs[@]})); then
    build_meta "${meta_file}" "${globs[@]}"
  else
    build_meta "${meta_file}"
  fi

  # Enumerate all relevant tracked files and compute allocated size in batches
  if ((${#globs[@]})); then
    list_tracked_sources "${globs[@]}" | batch_stat_sizes > "${sizes_file}"
  else
    list_tracked_sources | batch_stat_sizes > "${sizes_file}"
  fi

  # Map files to owning packages and aggregate counts/sizes; then aggregate by type/group
  map_and_aggregate "${meta_file}" "${sizes_file}" "${totals_file}" "${type_agg_file}" "${group_agg_file}"

  # Print reports
  echo ""
  echo "Top 10 packages by number of files"
  echo "----------------------------------"
  LC_ALL=C sort -t $'\t' -k2,2nr -k3,3nr "${totals_file}" | head -n 10 | \
    awk -F '\t' 'function hum(n){split("B KB MB GB TB PB",u," "); s=0; while(n>=1024&&s<5){n/=1024;s++} if(s==0){return sprintf("%d %s", n, u[1])} else {return sprintf("%.1f %s", n, u[s+1])}} {printf "%8d  %10s  %s\n", $2, hum($3), $1}'

  echo ""
  echo "Top 10 packages by allocated size"
  echo "---------------------------------"
  LC_ALL=C sort -t $'\t' -k3,3nr -k2,2nr "${totals_file}" | head -n 10 | \
    awk -F '\t' 'function hum(n){split("B KB MB GB TB PB",u," "); s=0; while(n>=1024&&s<5){n/=1024;s++} if(s==0){return sprintf("%d %s", n, u[1])} else {return sprintf("%.1f %s", n, u[s+1])}} {printf "%10s  %8d  %s\n", hum($3), $2, $1}'

  echo ""
  echo "Aggregates by type"
  echo "-------------------"
  LC_ALL=C sort -t $'\t' -k2,2nr -k3,3nr "${type_agg_file}" | \
    awk -F '\t' 'function hum(n){split("B KB MB GB TB PB",u," "); s=0; while(n>=1024&&s<5){n/=1024;s++} if(s==0){return sprintf("%d %s", n, u[1])} else {return sprintf("%.1f %s", n, u[s+1])}} {printf "%s\n  files: %d\n  size:  %s\n  pkgs:  %d\n\n", $1, $2, hum($3), $4}'

  echo "Aggregates by group"
  echo "-------------------"
  LC_ALL=C sort -t $'\t' -k2,2nr -k3,3nr "${group_agg_file}" | \
    awk -F '\t' 'function hum(n){split("B KB MB GB TB PB",u," "); s=0; while(n>=1024&&s<5){n/=1024;s++} if(s==0){return sprintf("%d %s", n, u[1])} else {return sprintf("%.1f %s", n, u[s+1])}} {printf "%s\n  files: %d\n  size:  %s\n  pkgs:  %d\n\n", $1, $2, hum($3), $4}'

  # Overall total across all matched packages
  echo "Total across all packages"
  echo "-------------------------"
  awk -F '\t' 'function hum(n){split("B KB MB GB TB PB",u," "); s=0; while(n>=1024&&s<5){n/=1024;s++} if(s==0){return sprintf("%d %s", n, u[1])} else {return sprintf("%.1f %s", n, u[s+1])}} {fc+=$2; sb+=$3; pkgs[$1]=1} END {n=0; for (p in pkgs) n++; printf "files: %d\nsize:  %s (%d bytes)\npkgs:  %d\n", fc, hum(sb), sb, n}' "${totals_file}"
}

# Build meta mapping file: for every kibana.jsonc -> emit: "pkgDir\ttype\tgroup"
build_meta() {
  local out_file=$1; shift || true
  # Remaining args (if any) are path globs to restrict the search
  local -a globs=( "$@" )
  : > "${out_file}"

  # Collect all kibana.jsonc paths
  local jsonc_list
  if ((${#globs[@]})); then
    # List tracked files under globs, filter to kibana.jsonc
    jsonc_list=$(git ls-files -- "${globs[@]}" | awk '/\/kibana\.jsonc$/')
  else
    jsonc_list=$(git ls-files -- '**/kibana.jsonc')
  fi

  # Single Node process parses all JSONC and prints lines: pkgDir\ttype\tgroup
  node -e '
    const fs = require("fs");
    const paths = fs.readFileSync(0, "utf8").split(/\r?\n/).filter(Boolean);
    for (const p of paths) {
      const dir = p.replace(/\/kibana\.jsonc$/, "");
      try {
        let s = fs.readFileSync(p, "utf8");
        s = s.replace(/\/\*[\s\S]*?\*\//g, "");
        s = s.replace(/(^|\s)\/\/.*$/mg, "");
        s = s.replace(/,\s*([}\]])/g, "$1");
        const o = JSON.parse(s);
        const type = (o && o.type) ? String(o.type) : "unknown";
        const group = (o && o.group) ? String(o.group) : "unknown";
        process.stdout.write(`${dir}\t${type}\t${group}\n`);
      } catch (e) {
        process.stdout.write(`${dir}\tunknown\tunknown\n`);
      }
    }
  ' > "${out_file}" <<< "${jsonc_list}"

  # Ensure deterministic order for later joins
  LC_ALL=C sort -t $'\t' -k1,1 "${out_file}" -o "${out_file}"
}

list_tracked_sources() {
  # Optional globs narrow the search space before extension filtering
  if (($#)); then
    git ls-files -z -- "$@" | \
      xargs -0 -n 500 sh -c '
        for f in "$@"; do
          case "$f" in
            *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mjsx|*.cjsx|*.json)
              printf "%s\0" "$f";;
          esac
        done
      ' sh
  else
    git ls-files -z -- \
      '**/*.ts' '**/*.tsx' \
      '**/*.js' '**/*.jsx' \
      '**/*.mjs' '**/*.cjs' \
      '**/*.mjsx' '**/*.cjsx' \
      '**/*.json'
  fi
}

batch_stat_sizes() {
  # Read NUL-separated paths from stdin; output tab-separated: path\tsizeBytes
  # Try BSD/macOS stat first; fallback to GNU; finally apparent size with wc -c.
  # We minimize processes by batching via xargs.
  if stat -f %N . >/dev/null 2>&1; then
    # BSD/macOS: %N=name, %b=512-byte blocks
    xargs -0 -n 500 stat -f '%N	%b' 2>/dev/null | awk -F '\t' '{bytes=$2*512; if(bytes<0)bytes=0; print $1"\t"bytes}'
  elif stat -c %n . >/dev/null 2>&1; then
    # GNU: %n=name, %b=blocks, %B=block size bytes
    xargs -0 -n 500 stat -c '%n	%b	%B' 2>/dev/null | awk -F '\t' '{bytes=$2*$3; if(bytes<0)bytes=0; print $1"\t"bytes}'
  else
    # Fallback: apparent size
    tr '\0' '\n' | xargs -n 500 -I{} sh -c 'for f in "$@"; do sz=$(wc -c < "$f" 2>/dev/null || echo 0); printf "%s\t%s\n" "$f" "$sz"; done' sh
  fi
}

# Using per-package totals and the meta mapping, aggregate by type and by group
aggregate_by_meta() {
  local meta_file=$1
  local totals_file=$2
  local type_out=$3
  local group_out=$4

  awk -F '\t' '
    FNR==NR {
      pkgType[$1]=$2;
      pkgGroup[$1]=$3;
      next;
    }
    {
      pkg=$1; files=$2; bytes=$3;
      t=pkgType[pkg]; g=pkgGroup[pkg];
      if (t=="") t="unknown";
      if (g=="") g="unknown";
      typeFiles[t]+=files; typeBytes[t]+=bytes; typePkgs[t]++;
      groupFiles[g]+=files; groupBytes[g]+=bytes; groupPkgs[g]++;
    }
    END {
      for (t in typeFiles) {
        printf("%s\t%d\t%d\t%d\n", t, typeFiles[t], typeBytes[t], typePkgs[t]) > typeOut;
      }
      for (g in groupFiles) {
        printf("%s\t%d\t%d\t%d\n", g, groupFiles[g], groupBytes[g], groupPkgs[g]) > groupOut;
      }
    }
  ' typeOut="${type_out}" groupOut="${group_out}" "${meta_file}" "${totals_file}"
}

# Get allocated size on disk in bytes for a single file, portably across macOS/BSD and GNU.
# Prefers allocated size (blocks * 512). Falls back to apparent size if needed.
get_alloc_size_bytes() {
  local path=$1
  local blocks

  # macOS/BSD: %b = number of 512B blocks allocated
  if blocks=$(stat -f %b "$path" 2>/dev/null); then
    if [[ -n "$blocks" ]]; then
      echo $(( blocks * 512 ))
      return 0
    fi
  fi

  # GNU: %b = number of 512B blocks allocated, %B = block size in bytes
  local g_blocks g_bsize
  if g_blocks=$(stat -c %b "$path" 2>/dev/null) && g_bsize=$(stat -c %B "$path" 2>/dev/null); then
    if [[ -n "$g_blocks" && -n "$g_bsize" ]]; then
      echo $(( g_blocks * g_bsize ))
      return 0
    fi
  fi

  # Fallback to apparent size
  local size
  if size=$(wc -c < "$path" 2>/dev/null); then
    echo "$size"
    return 0
  fi

  echo 0
}

# Map files to packages using longest-prefix match, aggregate totals, and compute groupings.
map_and_aggregate() {
  local meta_file=$1
  local sizes_file=$2
  local totals_out=$3
  local type_out=$4
  local group_out=$5
# Build a descending-length-sorted list of package directories into a temp file (robust to spaces)
  local sorted_pkgs_file
  sorted_pkgs_file=$(mktemp -t kibana_pkg_prefixes.XXXXXX)
  awk -F '\t' '{print $1}' "${meta_file}" | awk '{print length($0)"\t"$0}' | LC_ALL=C sort -k1,1nr | cut -f2- > "${sorted_pkgs_file}"

  # Read sorted package dirs first (FNR==NR), then walk sizes and aggregate by longest-prefix match
  awk -F '\t' -v totalsOut="${totals_out}" '
    BEGIN { OFS="\t" }
    FNR==NR {
      dir=$0;
      if (dir != "") {
        # ensure trailing slash for prefix matching
        pkgs[++pkgCount] = dir ((substr(dir, length(dir), 1)=="/")?"":"/");
      }
      next;
    }
    {
      path=$1; bytes=$2+0; owner="";
      for (i=1; i<=pkgCount; i++) {
        pre=pkgs[i];
        if (index(path, pre) == 1) { owner=substr(pre, 1, length(pre)-1); break }
      }
      if (owner != "") { cnt[owner]++; sum[owner]+=bytes }
    }
    END {
      for (p in cnt) printf "%s\t%d\t%d\n", p, cnt[p], sum[p] > totalsOut;
    }
  ' "${sorted_pkgs_file}" "${sizes_file}"

  # Sort totals for deterministic order
  LC_ALL=C sort -t $'\t' -k1,1 "${totals_out}" -o "${totals_out}"

  # Now compute aggregates by joining with meta
  aggregate_by_meta "${meta_file}" "${totals_out}" "${type_out}" "${group_out}"
}

main "$@"
