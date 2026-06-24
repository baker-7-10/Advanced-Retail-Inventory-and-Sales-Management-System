import { SuccessMessage, SUCCESS_MESSAGE_KEY } from '../../../../src/common/decorators/success-message.decorator';

describe('SuccessMessage Decorator', () => {
  it('should set metadata with message', () => {
    const message = 'Category created successfully';
    const decorator = SuccessMessage(message);

    const target = () => {};
    decorator(target);

    const metadata = Reflect.getOwnMetadata(SUCCESS_MESSAGE_KEY, target);
    expect(metadata).toBe(message);
  });
});
