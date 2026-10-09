# tools

`render-samples.js` renders every style in headless Chrome and writes PNGs to `samples/` plus UI screenshots to `docs/screenshots/`.

```bash
npm i playwright-core            # in any folder
CHROME=/path/to/chrome node tools/render-samples.js       # default palettes, 5:2 + 16:9
ALL=1 node tools/render-samples.js                        # + all palettes + 1:1
STRESS=1 node tools/render-samples.js                     # long / English / short titles -> ../cover-gen-stress/
```
