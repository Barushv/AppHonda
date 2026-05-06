export default async (request, context) => {
  const response = await context.next();
  const html = await response.text();
  const pass = Deno.env.get("ADMIN_PASS") || "changeme";
  const modified = html.replace("__ADMIN_PASS_PLACEHOLDER__", pass);
  return new Response(modified, {
    status: response.status,
    headers: response.headers,
  });
};
