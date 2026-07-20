import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { API_BASE_URL } from "./api.config";

export interface HybridSearchResult {
  id: string;
  external_id: string;
  title: string;
  abstract: string;
  authors: string[];
  category: string;
  published_at: string | null;
  keywordRank: number | null;
  semanticRank: number | null;
  rrfScore: number;
}

export interface HybridSearchPagination {
  page: number;
  pageSize: number;
  totalCandidates: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface HybridSearchResponse {
  query: string;
  searchMode: "hybrid";
  rankingMethod: "reciprocal_rank_fusion";
  embeddingModel: string;
  rrf: {
    k: number;
    keywordCandidateLimit: number;
    semanticCandidateLimit: number;
  };
  filters: {
    category: string | null;
  };
  pagination: HybridSearchPagination;
  results: HybridSearchResult[];
}

@Injectable({
  providedIn: "root",
})

export class SearchApiService {
  constructor(private readonly http: HttpClient) {}

  searchHybrid(
    query: string,
    category: string,
    page: number,
  ): Observable<HybridSearchResponse> {
    let params = new HttpParams()
      .set("q", query)
      .set("page", page)
      .set("pageSize", 10);

    if (category) {
      params = params.set("category", category);
    }

    return this.http.get<HybridSearchResponse>(
      `${API_BASE_URL}/search/hybrid`,
      { params },
    );
  }
}