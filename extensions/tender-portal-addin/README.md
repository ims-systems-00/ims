# iMS Tender Autopilot — portal add-in

Chrome MV3 extension that drafts answers on buyer portals from the tenant’s private Tender library via `POST /api/v1/tender/draft`.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder (`extensions/tender-portal-addin`)
4. Open **Options**, set:
   - API base URL (from Tender → Add-in in the app)
   - Bearer access token
   - Organisation ID (`x-org-id`)

## Use

1. Open a buyer portal questionnaire
2. Focus a response field (or select the question text)
3. Click the extension action **Draft focused field**, or press `Alt+Shift+D`
4. Review the panel. If `autofill` is true (approved, in-date library answer above threshold), the field is filled automatically; otherwise use **Fill field** or **Copy**

## Security

- Tokens are stored in `chrome.storage.sync` for the signed-in Chrome profile
- The extension only calls your configured API base
- Nothing is submitted to the buyer until a person pastes/fills the portal field
