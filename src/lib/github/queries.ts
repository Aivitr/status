export const GET_REPOSITORY_DATA = `
  query GetRepositoryData($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      stargazerCount
      forkCount
      milestones(first: 1, states: [OPEN], orderBy: {field: DUE_DATE, direction: ASC}) {
        nodes {
          title
          dueOn
          openIssues: issues(states: [OPEN]) {
            totalCount
          }
          closedIssues: issues(states: [CLOSED]) {
            totalCount
          }
        }
      }
      pullRequests(last: 20, orderBy: {field: CREATED_AT, direction: ASC}) {
        nodes {
          title
          state
          additions
          deletions
          createdAt
          mergedAt
          url
          author {
            login
          }
        }
      }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 100) {
              nodes {
                message
                committedDate
                oid
                author {
                  user {
                    login
                  }
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;
