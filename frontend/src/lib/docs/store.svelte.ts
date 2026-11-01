// The docs, fetched once and again on a "docs" event. Missing docs.json (503) is not an
// error worth showing: the map works without docs, the Docs view just says so.
import { getValidated } from "../api";
import { Docs } from "../schemas";
import { DocIndex } from "./pages";

class DocsStore {
  index = $state.raw<DocIndex | null>(null);
  error = $state<string | null>(null);

  async refresh() {
    try {
      this.index = new DocIndex(await getValidated("/api/docs", Docs));
      this.error = null;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}
export const docs = new DocsStore();
