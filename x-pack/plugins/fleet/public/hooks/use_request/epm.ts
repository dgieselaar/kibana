/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { epmRouteService } from '../../../common/services/routes';
import type {
  DeletePackageResponse,
  GetCategoriesRequest,
  GetCategoriesResponse,
  GetInfoResponse,
  GetLimitedPackagesResponse,
  GetPackagesRequest,
  GetPackagesResponse,
  GetStatsResponse,
  InstallPackageResponse,
} from '../../../common/types/rest_spec/epm';

import { sendRequest, useRequest } from './use_request';

export const useGetCategories = (query: GetCategoriesRequest['query'] = {}) => {
  return useRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
    query: { experimental: true, ...query },
  });
};

export const useGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query: { experimental: true, ...query },
  });
};

export const sendGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return sendRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query: { experimental: true, ...query },
  });
};

export const useGetLimitedPackages = () => {
  return useRequest<GetLimitedPackagesResponse>({
    path: epmRouteService.getListLimitedPath(),
    method: 'get',
  });
};

export const useGetPackageInfoByKey = (pkgkey: string) => {
  return useRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgkey),
    method: 'get',
  });
};

export const useGetPackageStats = (pkgName: string) => {
  return useRequest<GetStatsResponse>({
    path: epmRouteService.getStatsPath(pkgName),
    method: 'get',
  });
};

export const sendGetPackageInfoByKey = (pkgkey: string) => {
  return sendRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgkey),
    method: 'get',
  });
};

export const useGetFileByPath = (filePath: string) => {
  return useRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
  });
};

export const sendGetFileByPath = (filePath: string) => {
  return sendRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
  });
};

export const sendInstallPackage = (pkgkey: string) => {
  return sendRequest<InstallPackageResponse>({
    path: epmRouteService.getInstallPath(pkgkey),
    method: 'post',
  });
};

export const sendRemovePackage = (pkgkey: string) => {
  return sendRequest<DeletePackageResponse>({
    path: epmRouteService.getRemovePath(pkgkey),
    method: 'delete',
  });
};
