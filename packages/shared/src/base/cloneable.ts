import { Metadata } from './metadata';

export interface CloneableProps {
  [key: string]: unknown;
}

export abstract class Cloneable<Type, Props extends object> {
  constructor(
    readonly props: Props,
    readonly meta?: Metadata,
  ) {}

  clone(newProps: Partial<Props>, ...args: any[]): Type {
    return new (this.constructor as any)(
      {
        ...this.props,
        ...newProps,
      },
      this.meta,
      ...args,
    );
  }
}
