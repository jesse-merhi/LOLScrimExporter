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
