## Error Type
Console Error

## Error Message
[autosave] PUT /canvas failed (500): "{\"error\":\"Failed to save canvas\"}"


    at useCanvasAutosave.useCallback[save] (hooks/use-canvas-autosave.ts:45:17)

## Code Frame
  43 |       if (!res.ok) {
  44 |         const body = await res.text().catch(() => "")
> 45 |         console.error(`[autosave] PUT /canvas failed (${res.status}):`, body)
     |                 ^
  46 |         throw new Error(`Save failed: ${res.status}`)
  47 |       }
  48 |       onStatusChange("saved")

Next.js version: 16.2.4 (Turbopack)


## Error Type
Console Error

## Error Message
Save failed: 500


    at useCanvasAutosave.useCallback[save] (hooks/use-canvas-autosave.ts:46:15)

## Code Frame
  44 |         const body = await res.text().catch(() => "")
  45 |         console.error(`[autosave] PUT /canvas failed (${res.status}):`, body)
> 46 |         throw new Error(`Save failed: ${res.status}`)
     |               ^
  47 |       }
  48 |       onStatusChange("saved")
  49 |     } catch (err) {

Next.js version: 16.2.4 (Turbopack)
