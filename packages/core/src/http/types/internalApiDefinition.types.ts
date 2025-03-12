export type Request = {
  method: string;
  originalPath: string;
  path: string;
  contractDetails: {
    name: string;
  };
};

export type Response = {
  statusCode: number;
};
