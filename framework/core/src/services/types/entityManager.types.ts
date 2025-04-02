export type EntityManager = {
  fork: <Options>(options?: Options) => EntityManager;
};

export type DependencyShapes<
  CreateDependencies extends (...args: never[]) => {
    serviceDependencies: {
      configShapes: unknown;
    };
  }
> = ReturnType<CreateDependencies>['serviceDependencies']['configShapes'];
