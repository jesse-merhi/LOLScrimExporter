

export const graphqlQuery = `
query GetHistoricalSeries(
  $windowStartTime: String!
  $windowEndTime: String!
  $after: Cursor
  $before: Cursor
  $first: Int
  $last: Int
  $livePlayerIds: [ID!]
  $teamIds: [ID!]
  $tournamentIds: [ID!]
  $types: [SeriesType!]
  $titleIds: [ID!]
  $tournamentIncludeChildren: Boolean
) {
  allSeries(
    filter: {
      startTimeScheduled: { gte: $windowStartTime, lte: $windowEndTime }
      livePlayerIds: { in: $livePlayerIds }
      tournament: { 
        id: { in: $tournamentIds } 
        includeChildren: { equals: $tournamentIncludeChildren } 
      }
      teamIds: { in: $teamIds }
      types: $types
      titleIds: { in: $titleIds }
    }
    first: $first
    last: $last
    after: $after
    before: $before
    orderBy: StartTimeScheduled
    orderDirection: DESC
  ) {
    totalCount
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    edges {
      node {
        id
        type
        title {
          name
          nameShortened
        }
        tournament {
          name
        }
        startTimeScheduled
        format {
          nameShortened
        }
        teams {
          baseInfo {
            name
            logoUrl
            id
          }
        }
      }
    }
  }
}
`;
