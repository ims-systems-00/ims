/**
 * Public surface for the Search module (F-07).
 */

export { createSearchModule, type SearchRouterDeps } from "./routes/search.routes";
export {
  createGlobalSearchService,
  type GlobalSearchService,
  type SearchResultItem,
  type SearchResults,
} from "./services/search.service";
