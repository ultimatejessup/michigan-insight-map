Self-hosted OCR assets for the Bill Explainer (photos are read on the visitor's device).
- worker.min.js: tesseract.js 7.0.0 worker (Apache-2.0)
- tesseract-core-simd-lstm.wasm.js: tesseract.js-core (Apache-2.0)
- eng.traineddata.gz: Tesseract English model, "4.0.0_best_int" from @tesseract.js-data/eng (Apache-2.0)
Hosting these here means no image or text is sent to a third-party CDN to run OCR.
