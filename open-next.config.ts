// No ISR/revalidation and no next/image usage in this app (the map is a
// fully client-rendered SVG/table view over a static register), so no
// incremental-cache or images override is needed here.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
