import { readFile } from "fs/promises";
import { join } from "path";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSectionBySlug } from "@/lib/book-map";

const CONTENT_DIR = join(process.cwd(), "content");

export async function GET(request, { params }) {
  const slug = params.slug.join("/");
  const section = getSectionBySlug(slug);

  // Unknown slug
  if (!section) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Free sections need no auth
  if (!section.free) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "auth_required" }, { status: 401 });
    }

    // Check paid access
    const res = await fetch(
      new URL("/api/check-access", request.url).toString(),
      { headers: { cookie: request.headers.get("cookie") || "" } }
    );
    const access = await res.json();

    if (!access.hasAccess) {
      return Response.json({ error: "access_required" }, { status: 403 });
    }
  }

  // Load markdown file
  const filePath = join(CONTENT_DIR, `${slug}.md`);
  try {
    const content = await readFile(filePath, "utf8");
    return Response.json({ content, section });
  } catch {
    // File not yet written — return placeholder
    return Response.json({
      content: `# ${section.subtitle}\n\n*Content coming soon.*`,
      section,
      placeholder: true,
    });
  }
}
