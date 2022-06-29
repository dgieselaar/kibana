import { Transaction } from './es_schemas/ui/transaction';
import { Span } from './es_schemas/ui/span';

export interface ICriticalPathItem {
  hash: string;
  name: string;
  selfDuration: number;
  duration: number;
  parentHash: string;
  depth: number;
  layers: Record<string, string>;
  docType: string;
  sampleDoc?: Transaction | Span;
}

export interface ICriticalPath {
  items: ICriticalPathItem[];
  sampleSize: number;
}