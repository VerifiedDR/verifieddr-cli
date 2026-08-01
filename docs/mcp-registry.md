# Publishing to the official MCP registry

`server.json` in the repo root describes the VerifiedDR MCP server (remote
streamable HTTP + the npm stdio bridge) for the official registry at
`registry.modelcontextprotocol.io`.

One-time setup, then a publish per version bump:

```bash
# 1. Install the publisher CLI
brew install mcp-publisher
# (or: download a release from github.com/modelcontextprotocol/registry)

# 2. Prove we own verifieddr.com (the com.verifieddr/* namespace).
#    DNS flavor: add the TXT record it prints to verifieddr.com, then:
mcp-publisher login dns --domain verifieddr.com
#    HTTP flavor instead: it asks for a file under
#    https://verifieddr.com/.well-known/ - ask Claude to add the route.

# 3. Publish (run from this repo root; npm 0.9.1 must be published first,
#    because the registry validates the "mcpName" field inside the tarball)
npm publish
mcp-publisher publish
```

Checklist per release:

- [ ] bump `version` in `package.json` AND `server.json` (and the nested
      `packages[0].version`)
- [ ] `npm publish` before `mcp-publisher publish`
- [ ] keep `mcpName` in `package.json` equal to `name` in `server.json`

Community directories worth submitting once (manual web forms):
mcp.so, smithery.ai, pulsemcp.com, glama.ai/mcp/servers, mcpservers.org,
and Cursor's directory (cursor.com/directory).
