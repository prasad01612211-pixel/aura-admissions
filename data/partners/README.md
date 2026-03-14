# Partner Branch Master

This folder stores research-grade onboarding data for partner institutions across Andhra Pradesh and Telangana.

`college-branch-master-ap-ts.csv` is intentionally broader than the live seed set:

- `high` confidence: exact branch address/pincode found on an official site or a clearly attributable public listing
- `medium` confidence: current public market listing or official campus mention with inferred district/pincode
- `low` confidence: institution/city presence is public, but exact campus identity is still missing

Use this file for:

- branch onboarding
- branch verification calls
- trust-pack enrichment
- future Supabase branch imports after manual verification

Do not directly push all `low` confidence rows into parent-facing recommendations.
