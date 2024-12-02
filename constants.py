graphql='''{"operationName":"GetHistoricalSeries","variables":{"first":10,"windowStartTime":"2022-01-01T00:00:00.000+11:00","windowEndTime":"2024-12-03T23:59:59.999+11:00","types":["SCRIM"]},"query":"query GetHistoricalSeries($windowStartTime: String!, $windowEndTime: String!, $after: Cursor, $before: Cursor, $first: Int, $last: Int, $livePlayerIds: [ID!], $teamIds: [ID!], $tournamentIds: [ID!], $types: [SeriesType!], $titleIds: [ID!], $tournamentIncludeChildren: Boolean) {
  allSeries(
    filter: {startTimeScheduled: {gte: $windowStartTime, lte: $windowEndTime}, livePlayerIds: {in: $livePlayerIds}, tournament: {id: {in: $tournamentIds}, includeChildren: {equals: $tournamentIncludeChildren}}, teamIds: {in: $teamIds}, types: $types, titleIds: {in: $titleIds}}
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
      __typename
    }
    edges {
      node {
        id
        type
        title {
          name
          nameShortened
          __typename
        }
        tournament {
          name
          __typename
        }
        startTimeScheduled
        format {
          nameShortened
          __typename
        }
        teams {
          baseInfo {
            name
            logoUrl
            id
            __typename
          }
          __typename
        }
        productServiceLevels {
          productName
          serviceLevel
          __typename
        }
        externalLinks {
          dataProvider {
            name
            __typename
          }
          externalEntity {
            id
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
"}'''