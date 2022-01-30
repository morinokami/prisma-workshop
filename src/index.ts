import { ApolloServer } from "apollo-server";
import { DateTimeResolver } from "graphql-scalars";
import { Context, context } from "./context";

const typeDefs = `
type Query {
  allUsers: [User!]!
  postById(id: Int!): Post
  feed(searchString: String, skip: Int, take: Int): [Post!]!
  draftsByUser(id: Int!): [Post]
}

type Mutation {
  signupUser(name: String, email: String!): User!
  createDraft(title: String!, content: String, authorEmail: String): Post
  incrementPostViewCount(id: Int!): Post
  deletePost(id: Int!): Post
}

type User {
  id: Int!
  email: String!
  name: String
  posts: [Post!]!
}

type Post {
  id: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
  title: String!
  content: String
  published: Boolean!
  viewCount: Int!
  author: User
}

scalar DateTime
`;

const resolvers = {
  Query: {
    allUsers: (_parent, _args, context: Context) => {
      return context.prisma.user.findMany();
    },
    postById: (_parent, args: { id: number }, context: Context) => {
      return context.prisma.post.findUnique({
        where: {
          id: args.id,
        }
      });
    },
    feed: (
      _parent,
      args: {
        searchString: string | undefined;
        skip: number | undefined;
        take: number | undefined;
      },
      context: Context
    ) => {
      const or = args.searchString ? {
        OR: [
            { title: { contains: args.searchString } },
            { content: { contains: args.searchString } },
          ],
      } : {};
      return context.prisma.post.findMany({
        where: {
          published: true,
          ...or,
        },
        skip: args.skip,
        take: args.take,
      });
    },
    draftsByUser: (_parent, args: { id: number }, context: Context) => {
      return context.prisma.user.findUnique({
        where: {
          id: args.id,
        },
      }).posts({
        where: {
          published: false,
        },
      });
    },
  },
  Mutation: {
    signupUser: (
      _parent,
      args: { name: string | undefined; email: string },
      context: Context
    ) => {
      return context.prisma.user.create({
        data: {
          name: args.name,
          email: args.email,
        },
      });
    },
    createDraft: (
      _parent,
      args: { title: string; content: string | undefined; authorEmail: string },
      context: Context
    ) => {
      return context.prisma.post.create({
        data: {
          title: args.title,
          content: args.content,
          author: {
            connect: {
              email: args.authorEmail,
            },
          },
        },
      });
    },
    incrementPostViewCount: (
      _parent,
      args: { id: number },
      context: Context
    ) => {
      return context.prisma.post.update({
        where: {
          id: args.id,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    },
    deletePost: (_parent, args: { id: number }, context: Context) => {
      return context.prisma.post.delete({
        where: {
          id: args.id,
        },
      });
    },
  },
  Post: {
    author: (parent, _args, context: Context) => {
      return context.prisma.user.findUnique({
        where: {
          id: parent.id,
        },
      }).posts();
    },
  },
  User: {
    posts: (parent, _args, context: Context) => {
      return context.prisma.post.findUnique({
        where: {
          id: parent.id,
        },
      }).author();
    },
  },
  DateTime: DateTimeResolver,
};

const server = new ApolloServer({ typeDefs, resolvers, context });
server.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at: http://localhost:4000`)
);
