import { Cloneable } from '../../src/base/cloneable';
import { Metadata } from '../../src/base/metadata';

interface TestProps {
  name?: string;
  age?: number;
  [key: string]: unknown;
}

class TestCloneable extends Cloneable<TestCloneable, TestProps> {
  constructor(props: TestProps, meta?: Metadata) {
    super(props, meta);
  }
}

test('Deve criar uma instância de TestCloneable com propriedades e metadados', () => {
  const props = { name: 'Teste', age: 25 };
  const meta = new Metadata({ module: 'Test', object: 'TestCloneable' });

  const instance = new TestCloneable(props, meta);

  expect(instance.props).toEqual(props);
  expect(instance.meta).toEqual(meta);
});

test('Deve clonar uma instância e atualizar propriedades', () => {
  const instance = new TestCloneable({ name: 'Original', age: 30 });
  const clonedInstance = instance.clone({ name: 'Cloned' });

  expect(clonedInstance).toBeInstanceOf(TestCloneable);
  expect(clonedInstance.props.name).toBe('Cloned');
  expect(clonedInstance.props.age).toBe(30);
});

test('Deve manter os metadados ao clonar', () => {
  const meta = new Metadata({ module: 'Test', object: 'TestCloneable' });
  const instance = new TestCloneable({ name: 'Teste' }, meta);

  const clonedInstance = instance.clone({ name: 'Novo' });
  expect(clonedInstance.meta?.module).toEqual(meta.module);
  expect(clonedInstance.meta?.object).toEqual(meta.object);
});
