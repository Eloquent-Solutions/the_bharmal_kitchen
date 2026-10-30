# Windows Wi-Fi / LAN printing

Hardware verification is deferred. This bridge sends **ESC/POS text** over a raw TCP connection (usually port 9100). Confirm that the eventual printer supports this protocol; some Wi-Fi printers require a Windows driver instead. Browser bill and KOT printing remains available.

## Install on the Windows computer

1. Install a supported Node.js LTS release from [nodejs.org](https://nodejs.org/).
2. Copy this `print-bridge` folder onto that computer. No npm installation is needed.
3. Double-click `start-windows.cmd`. First launch creates `config.local.json` with a random pairing token. Close the window while configuring it.
4. Add the printer's fixed/reserved LAN IPv4 address and TCP port under `targets`. Keep the bridge token private. Example (replace the address):

   ```json
   {
     "token": "KEEP_THE_GENERATED_64_CHARACTER_TOKEN",
     "origins": ["https://the-bharmal-kitchen.vercel.app", "http://127.0.0.1:5173"],
     "targets": [{"ipAddress": "192.168.1.50", "port": 9100}]
   }
   ```

5. Run `start-windows.cmd` again. It binds only to `127.0.0.1:19771`, on the Windows computer. The printer and computer must be on the same reachable LAN. Do not open this bridge port to the internet.
6. In the app, open **Printing → Printers**, enter the same target address, select 58 mm / 80 mm paper, and save. Pair the browser using the token from the local configuration. If prompted, allow local network access. The token is stored only in that browser, never in Firestore.
7. In **Print Routing**, add a customer receipt route and a kitchen route. `*` routes any unmatched kitchen station. Set exact station names for separate kitchen printers. Backup routes are used only if the initial connection fails before sending data.
8. Enable network printing, then enable automatic receipts/KOTs in **Settings → POS**. A paired signed-in Owner/Admin/Manager browser and the bridge must remain open to process jobs. Configure each physical printer on one print station; multiple browser workers share cloud claims.

## Delivery and recovery

- A bill, its stock deduction, KOT, and automatic print jobs commit together. Retrying the same bill ID creates no extra jobs.
- Each copy has a unique durable job ID. Jobs move from `pending` to `sending`, then `sent`, `failed`, or `unknown`.
- `sent` means the OS accepted the TCP transfer. It cannot prove that paper came out or that a cutter worked.
- A crash, timeout after sending starts, or lost reply can result in `unknown`. The cloud lease expires into `unknown`, never into an automatic repeat. Staff must check the printer before requesting a new copy.
- `jobs.local.json` records job IDs before transmission and keeps results across restarts. Do not delete this journal while jobs may be retried. A repeated ID with changed content is rejected.
- Do not automatically restart a job on another printer after an uncertain transfer. A backup is attempted only for a connection failure before data is sent.
- No cash drawer kick is sent. Native text supports English/ASCII with `INR` amounts; unsupported characters are replaced. Browser printing supports full Unicode. Browser pixel font sizes differ from the printer's normal/double-size native text modes. Logo/QR/raster design is not supported in this version.

## Deferred physical acceptance

When the printer is available, verify its model/protocol and reserved IP, firewall/LAN reachability, 58/80 mm layout, accents/character encoding, cutter support, receipt and multi-station KOT routing, configured copies, out-of-paper behavior, restart recovery, and the Windows browser's local-network permissions. Do not describe simulator success as a physical printer test.

Technical references: [Node TCP sockets](https://nodejs.org/api/net.html), [Epson ESC/POS command reference](https://download4.epson.biz/sec_pubs/pos/reference_en/).
