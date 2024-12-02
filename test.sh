curl 'https://lol.grid.gg/auth/login' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'content-type: text/plain;charset=UTF-8' \
  -H 'origin: https://lol.grid.gg' \
  -H 'priority: u=1, i' \
  -H 'referer: https://lol.grid.gg/login?requestUrl=/competitors/match-history-viewer' \
  -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \
  --data-raw '{"loginId":"amclaren@teambliss.com.au","password":"Blissispog"}'




  curl 'https://lol.grid.gg/api/organisations/mine' \
  -H 'accept: application/json' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM0OWE0MTUzNSJ9.eyJhdWQiOiJiOWVlMWRlYy1lOGRhLTRmZDEtYjg1MS1mYzE3OTEyODVjNDYiLCJleHAiOjE3MzMxOTMyODksImlhdCI6MTczMzE0Mjg4OSwiaXNzIjoiZ3JpZC5nZyIsInN1YiI6ImRhM2M1YzlhLTkyZTEtNDUxZS04ZjY4LWU0NDc5ZmJiYzg0ZSIsImp0aSI6IjNlZWE5ZWU1LTNlOWQtNGViZi04NjRhLTZjMjMzZjY0NTY3MyIsImF1dGhlbnRpY2F0aW9uVHlwZSI6IlBBU1NXT1JEIiwiZW1haWwiOiJhbWNsYXJlbkB0ZWFtYmxpc3MuY29tLmF1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInByZWZlcnJlZF91c2VybmFtZSI6IlRlYW0gQmxpc3MgT3duZXIiLCJhcHBsaWNhdGlvbklkIjoiYjllZTFkZWMtZThkYS00ZmQxLWI4NTEtZmMxNzkxMjg1YzQ2Iiwicm9sZXMiOlsiY2VudHJhbF9kYXRhX2ZlZWRfY29uc3VtZXIiLCJjb21wZXRpdG9yIiwiZmlsZV9kb3dubG9hZF9hcGlfY29uc3VtZXIiLCJvcmdhbmlzYXRpb25fb3duZXIiLCJzZXJpZXNfc3RhdGVfYXBpX29ubHlfZW5kZWRfc2VyaWVzX2NvbnN1bWVyIiwidXNlciJdLCJzaWQiOiI4YzZkNDIyMC00OWU2LTQwNDgtYTQ1Yi01MDkxMjc2MDE3NTEiLCJhdXRoX3RpbWUiOjE3MzMxNDI4ODksInRpZCI6IjI2YmNlNWUxLTdkZDQtOTQ1MS1mMjI1LTJiNGRlYjQwMmZkOCIsImdyb3VwcyI6WyJjNGM3N2ExYS1jOGM0LTQyMTgtOTcyNC1mM2U2M2E0NmFkYTciXX0.oLcyy5G9f3YvGCI5-3GmG4GJrDTRTmoKMIwUg_BClPc' \
  -H 'cookie: __cf_bm=NPgxzrIJmtGRxX.ExvTExd2h9lxMFXx3oiMqQfU0Few-1733142802-1.0.1.1-h9REr0s5Kgr5jg5S.396Jalhq5UHQpqax2XtZRCrMbzF29LmppPEyECt05K_ns.nh081p3B6UgUHwp_e06p.AA; _cfuvid=vZvSD5fs8f5BzuktuPkZm5xDg5hRegSyUNG9JGMuC4w-1733142802498-0.0.1.1-604800000; cf_clearance=1qkS.XQjcrny9avaWuNQe_8T8p686snL4O2I3DP7aeY-1733142803-1.2.1.1-PoJ2_7CjcdFYnIJrk_geic.7.1528G25d.wP9ddAeYtLbOL25ZQBXSGrGQzthRBC25j4OvfoZSZ_sZ0vPEmLFM5t2kFyuduw9B8ks64jAFDaqE7ayhRzxxtLazNmijs36jyFbFWiAD6ZGCmgy_VuCB9T1cb1QLvbq1pdz7PMFSfSdY63FGVQQ1dOzdYTyCWGjkhlRQeZv6HqI7u_lHyQRmsy1CEElCTPBVanAKo.rQ8yWPQr.G4pHT11aTVPwYxUpM6PqdpENO2nkgIL03yBdi030yhRojHX8JHQGHkeMccEionsbrAep_2SYUg_56dhsHqCCPODM6gDjJhcPXnP.5oVpVWpa3_pZOmHp0FAtD.UxgHNHqTbfMbVlDmFlfCxfXAInWNlJphr49zRicVVZQ; rl_page_init_referrer=RudderEncrypt%3AU2FsdGVkX1%2BuD8nQQ6etNXlfIlpDUHzCIbu%2Fg29iw7DfHrKv1cve1ErAhde2TbpZ; rl_page_init_referring_domain=RudderEncrypt%3AU2FsdGVkX1%2B7ExPzXIBYsBx%2F2nmdUpmn8XP3tiCKM4k%3D; INGRESSCOOKIE=1733142852.207.27.257400|42220a459444f479f6adbb2466bc426f; rl_session=RudderEncrypt%3AU2FsdGVkX1%2BsqiBfyWI26u5vgMj%2F9pbOjmsoMUSKHlu7ciGtpFLgxwNbkXJb5UlyGD4SswnO0XgxClKMDb6cFlhwRYyDoSM95vXP%2FHQ%2Fq9iL0N5Ai5AUy0SRM5POgoMgMnVE9c%2FAATvRt%2BemflxBXw%3D%3D; rl_user_id=RudderEncrypt%3AU2FsdGVkX1%2BVcH8%2Fq0LoEXyZg2D2sAZMNKnF6RiVUoE%3D; rl_trait=RudderEncrypt%3AU2FsdGVkX1%2B%2B%2BgllkRldwlnEDoAiAfgpTTHdoZQ7giU%3D; rl_group_id=RudderEncrypt%3AU2FsdGVkX1%2FQZM%2BMq6LBwskNroRw96JPDYIcYDbCowg%3D; rl_group_trait=RudderEncrypt%3AU2FsdGVkX1%2Bio0eEzXY5hHbt7YIihBLiRX44xxIYYUU%3D; rl_anonymous_id=RudderEncrypt%3AU2FsdGVkX19UEC%2Bwuv%2BCqzikHoCjf1pgZI6%2FPwe1iXHz4l9KwKl0i10m1L7HssDZPP8ITUZ5Hq%2FpqOudyYOcqQ%3D%3D; Authorization=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM0OWE0MTUzNSJ9.eyJhdWQiOiJiOWVlMWRlYy1lOGRhLTRmZDEtYjg1MS1mYzE3OTEyODVjNDYiLCJleHAiOjE3MzMxOTMyODksImlhdCI6MTczMzE0Mjg4OSwiaXNzIjoiZ3JpZC5nZyIsInN1YiI6ImRhM2M1YzlhLTkyZTEtNDUxZS04ZjY4LWU0NDc5ZmJiYzg0ZSIsImp0aSI6IjNlZWE5ZWU1LTNlOWQtNGViZi04NjRhLTZjMjMzZjY0NTY3MyIsImF1dGhlbnRpY2F0aW9uVHlwZSI6IlBBU1NXT1JEIiwiZW1haWwiOiJhbWNsYXJlbkB0ZWFtYmxpc3MuY29tLmF1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInByZWZlcnJlZF91c2VybmFtZSI6IlRlYW0gQmxpc3MgT3duZXIiLCJhcHBsaWNhdGlvbklkIjoiYjllZTFkZWMtZThkYS00ZmQxLWI4NTEtZmMxNzkxMjg1YzQ2Iiwicm9sZXMiOlsiY2VudHJhbF9kYXRhX2ZlZWRfY29uc3VtZXIiLCJjb21wZXRpdG9yIiwiZmlsZV9kb3dubG9hZF9hcGlfY29uc3VtZXIiLCJvcmdhbmlzYXRpb25fb3duZXIiLCJzZXJpZXNfc3RhdGVfYXBpX29ubHlfZW5kZWRfc2VyaWVzX2NvbnN1bWVyIiwidXNlciJdLCJzaWQiOiI4YzZkNDIyMC00OWU2LTQwNDgtYTQ1Yi01MDkxMjc2MDE3NTEiLCJhdXRoX3RpbWUiOjE3MzMxNDI4ODksInRpZCI6IjI2YmNlNWUxLTdkZDQtOTQ1MS1mMjI1LTJiNGRlYjQwMmZkOCIsImdyb3VwcyI6WyJjNGM3N2ExYS1jOGM0LTQyMTgtOTcyNC1mM2U2M2E0NmFkYTciXX0.oLcyy5G9f3YvGCI5-3GmG4GJrDTRTmoKMIwUg_BClPc; RefreshToken=DAovAKWfjxsF7c-e2gKrQFZn5BFDqJeNJHBAE7cZk9Qtj1-S1wKfsA' \
  -H 'priority: u=1, i' \
  -H 'referer: https://lol.grid.gg/competitors/match-history-viewer' \
  -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'