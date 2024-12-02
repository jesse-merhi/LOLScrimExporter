import json
import requests
from constants import graphql
# with open("summary.json") as file:
#     hello = json.loads(file.read())
#     print(hello["participants"][0])
raw_data ='{"loginId":"<username>","password":"<password>"}'
response = requests.post("https://lol.grid.gg/auth/login",data=raw_data)
auth = response.headers.get('Set-Cookie').split(";")[0].replace("Authorization=","")

response = requests.get("https://api.grid.gg/file-download/end-state/riot/series/2710435/games/1/summary",headers={"Authorization":f"Bearer {auth}"})
participants = response.json()["participants"]
for player in response.json()["participants"]:
    print(player["riotIdGameName"])
    print("Wards Placed",player["wardsPlaced"])
    print()

response = requests.post("https://api.grid.gg/central-data/graphql",data='{"operationName":"GetHistoricalSeries","variables":{"first":10,"windowStartTime":"2022-01-01T00:00:00.000+11:00","windowEndTime":"2024-12-03T23:59:59.999+11:00","types":["SCRIM"]},"query":"query GetHistoricalSeries($windowStartTime: String\u0021, $windowEndTime: String\u0021, $after: Cursor, $before: Cursor, $first: Int, $last: Int, $livePlayerIds: [ID\u0021], $teamIds: [ID\u0021], $tournamentIds: [ID\u0021], $types: [SeriesType\u0021], $titleIds: [ID\u0021], $tournamentIncludeChildren: Boolean) {\\n  allSeries(\\n    filter: {startTimeScheduled: {gte: $windowStartTime, lte: $windowEndTime}, livePlayerIds: {in: $livePlayerIds}, tournament: {id: {in: $tournamentIds}, includeChildren: {equals: $tournamentIncludeChildren}}, teamIds: {in: $teamIds}, types: $types, titleIds: {in: $titleIds}}\\n    first: $first\\n    last: $last\\n    after: $after\\n    before: $before\\n    orderBy: StartTimeScheduled\\n    orderDirection: DESC\\n  ) {\\n    totalCount\\n    pageInfo {\\n      hasPreviousPage\\n      hasNextPage\\n      startCursor\\n      endCursor\\n      __typename\\n    }\\n    edges {\\n      node {\\n        id\\n        type\\n        title {\\n          name\\n          nameShortened\\n        }\\n        tournament {\\n          name\\n        }\\n        startTimeScheduled\\n        format {\\n          nameShortened\\n        }\\n        teams {\\n          baseInfo {\\n            name\\n            logoUrl\\n            id\\n            }\\n        }\\n        productServiceLevels {\\n          productName\\n          serviceLevel\\n        }\\n        externalLinks {\\n          dataProvider {\\n            name\\n            }\\n          externalEntity {\\n            id\\n            }\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n"}',headers={"Authorization":f"Bearer {auth}","Content-Type":"application/json"})
for edge in response.json()["data"]["allSeries"]["edges"]:
    node = edge["node"]
    teams = node["teams"]
    print(node["id"],teams[0]["baseInfo"]["name"],"vs",teams[1]["baseInfo"]["name"])
# return ("this", "that")

# curl 'https://lol.grid.gg/api/organisations/mine' \
#   -H 'accept: application/json' \
#   -H 'accept-language: en-US,en;q=0.9' \
#   -H 'authorization: Bearer <token>
#   -H 'cookie: __cf_bm=NPgxzrIJmtGRxX.ExvTExd2h9lxMFXx3oiMqQfU0Few-1733142802-1.0.1.1-h9REr0s5Kgr5jg5S.396Jalhq5UHQpqax2XtZRCrMbzF29LmppPEyECt05K_ns.nh081p3B6UgUHwp_e06p.AA; _cfuvid=vZvSD5fs8f5BzuktuPkZm5xDg5hRegSyUNG9JGMuC4w-1733142802498-0.0.1.1-604800000; cf_clearance=1qkS.XQjcrny9avaWuNQe_8T8p686snL4O2I3DP7aeY-1733142803-1.2.1.1-PoJ2_7CjcdFYnIJrk_geic.7.1528G25d.wP9ddAeYtLbOL25ZQBXSGrGQzthRBC25j4OvfoZSZ_sZ0vPEmLFM5t2kFyuduw9B8ks64jAFDaqE7ayhRzxxtLazNmijs36jyFbFWiAD6ZGCmgy_VuCB9T1cb1QLvbq1pdz7PMFSfSdY63FGVQQ1dOzdYTyCWGjkhlRQeZv6HqI7u_lHyQRmsy1CEElCTPBVanAKo.rQ8yWPQr.G4pHT11aTVPwYxUpM6PqdpENO2nkgIL03yBdi030yhRojHX8JHQGHkeMccEionsbrAep_2SYUg_56dhsHqCCPODM6gDjJhcPXnP.5oVpVWpa3_pZOmHp0FAtD.UxgHNHqTbfMbVlDmFlfCxfXAInWNlJphr49zRicVVZQ; rl_page_init_referrer=RudderEncrypt%3AU2FsdGVkX1%2BuD8nQQ6etNXlfIlpDUHzCIbu%2Fg29iw7DfHrKv1cve1ErAhde2TbpZ; rl_page_init_referring_domain=RudderEncrypt%3AU2FsdGVkX1%2B7ExPzXIBYsBx%2F2nmdUpmn8XP3tiCKM4k%3D; INGRESSCOOKIE=1733142852.207.27.257400|42220a459444f479f6adbb2466bc426f; rl_session=RudderEncrypt%3AU2FsdGVkX1%2BsqiBfyWI26u5vgMj%2F9pbOjmsoMUSKHlu7ciGtpFLgxwNbkXJb5UlyGD4SswnO0XgxClKMDb6cFlhwRYyDoSM95vXP%2FHQ%2Fq9iL0N5Ai5AUy0SRM5POgoMgMnVE9c%2FAATvRt%2BemflxBXw%3D%3D; rl_user_id=RudderEncrypt%3AU2FsdGVkX1%2BVcH8%2Fq0LoEXyZg2D2sAZMNKnF6RiVUoE%3D; rl_trait=RudderEncrypt%3AU2FsdGVkX1%2B%2B%2BgllkRldwlnEDoAiAfgpTTHdoZQ7giU%3D; rl_group_id=RudderEncrypt%3AU2FsdGVkX1%2FQZM%2BMq6LBwskNroRw96JPDYIcYDbCowg%3D; rl_group_trait=RudderEncrypt%3AU2FsdGVkX1%2Bio0eEzXY5hHbt7YIihBLiRX44xxIYYUU%3D; rl_anonymous_id=RudderEncrypt%3AU2FsdGVkX19UEC%2Bwuv%2BCqzikHoCjf1pgZI6%2FPwe1iXHz4l9KwKl0i10m1L7HssDZPP8ITUZ5Hq%2FpqOudyYOcqQ%3D%3D; Authorization=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImM0OWE0MTUzNSJ9.eyJhdWQiOiJiOWVlMWRlYy1lOGRhLTRmZDEtYjg1MS1mYzE3OTEyODVjNDYiLCJleHAiOjE3MzMxOTMyODksImlhdCI6MTczMzE0Mjg4OSwiaXNzIjoiZ3JpZC5nZyIsInN1YiI6ImRhM2M1YzlhLTkyZTEtNDUxZS04ZjY4LWU0NDc5ZmJiYzg0ZSIsImp0aSI6IjNlZWE5ZWU1LTNlOWQtNGViZi04NjRhLTZjMjMzZjY0NTY3MyIsImF1dGhlbnRpY2F0aW9uVHlwZSI6IlBBU1NXT1JEIiwiZW1haWwiOiJhbWNsYXJlbkB0ZWFtYmxpc3MuY29tLmF1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInByZWZlcnJlZF91c2VybmFtZSI6IlRlYW0gQmxpc3MgT3duZXIiLCJhcHBsaWNhdGlvbklkIjoiYjllZTFkZWMtZThkYS00ZmQxLWI4NTEtZmMxNzkxMjg1YzQ2Iiwicm9sZXMiOlsiY2VudHJhbF9kYXRhX2ZlZWRfY29uc3VtZXIiLCJjb21wZXRpdG9yIiwiZmlsZV9kb3dubG9hZF9hcGlfY29uc3VtZXIiLCJvcmdhbmlzYXRpb25fb3duZXIiLCJzZXJpZXNfc3RhdGVfYXBpX29ubHlfZW5kZWRfc2VyaWVzX2NvbnN1bWVyIiwidXNlciJdLCJzaWQiOiI4YzZkNDIyMC00OWU2LTQwNDgtYTQ1Yi01MDkxMjc2MDE3NTEiLCJhdXRoX3RpbWUiOjE3MzMxNDI4ODksInRpZCI6IjI2YmNlNWUxLTdkZDQtOTQ1MS1mMjI1LTJiNGRlYjQwMmZkOCIsImdyb3VwcyI6WyJjNGM3N2ExYS1jOGM0LTQyMTgtOTcyNC1mM2U2M2E0NmFkYTciXX0.oLcyy5G9f3YvGCI5-3GmG4GJrDTRTmoKMIwUg_BClPc; RefreshToken=DAovAKWfjxsF7c-e2gKrQFZn5BFDqJeNJHBAE7cZk9Qtj1-S1wKfsA' \
#   -H 'priority: u=1, i' \
#   -H 'referer: https://lol.grid.gg/competitors/match-history-viewer' \
#   -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"' \
#   -H 'sec-ch-ua-mobile: ?0' \
#   -H 'sec-ch-ua-platform: "Windows"' \
#   -H 'sec-fetch-dest: empty' \
#   -H 'sec-fetch-mode: cors' \
#   -H 'sec-fetch-site: same-origin' \
#   -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'



# curl 'https://api.grid.gg/central-data/graphql' \
#   -H 'accept: */*' \
#   -H 'accept-language: en-US,en;q=0.9' \
#   -H 'authorization: Bearer <token>
#   --data-raw $'{"operationName":"GetHistoricalSeries","variables":{"first":10,"windowStartTime":"2022-01-01T00:00:00.000+11:00","windowEndTime":"2024-12-03T23:59:59.999+11:00","types":["SCRIM"]},"query":"query GetHistoricalSeries($windowStartTime: String\u0021, $windowEndTime: String\u0021, $after: Cursor, $before: Cursor, $first: Int, $last: Int, $livePlayerIds: [ID\u0021], $teamIds: [ID\u0021], $tournamentIds: [ID\u0021], $types: [SeriesType\u0021], $titleIds: [ID\u0021], $tournamentIncludeChildren: Boolean) {\\n  allSeries(\\n    filter: {startTimeScheduled: {gte: $windowStartTime, lte: $windowEndTime}, livePlayerIds: {in: $livePlayerIds}, tournament: {id: {in: $tournamentIds}, includeChildren: {equals: $tournamentIncludeChildren}}, teamIds: {in: $teamIds}, types: $types, titleIds: {in: $titleIds}}\\n    first: $first\\n    last: $last\\n    after: $after\\n    before: $before\\n    orderBy: StartTimeScheduled\\n    orderDirection: DESC\\n  ) {\\n    totalCount\\n    pageInfo {\\n      hasPreviousPage\\n      hasNextPage\\n      startCursor\\n      endCursor\\n}\\n    edges {\\n      node {\\n        id\\n        type\\n        title {\\n          name\\n          nameShortened\\n        }\\n        tournament {\\n          name\\n        }\\n        startTimeScheduled\\n        format {\\n          nameShortened\\n        }\\n        teams {\\n          baseInfo {\\n            name\\n            logoUrl\\n            id\\n            }\\n        }\\n        productServiceLevels {\\n          productName\\n          serviceLevel\\n        }\\n        externalLinks {\\n          dataProvider {\\n            name\\n            }\\n          externalEntity {\\n            id\\n            }\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n"}'

