import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAfterStartDate', async: false })
export class IsAfterStartDateConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const object = args.object as Record<string, unknown>;
    const startDate = object.startDate;
    if (typeof startDate !== 'string' || typeof endDate !== 'string') return false;
    return new Date(endDate) > new Date(startDate);
  }

  defaultMessage() {
    return 'endDate must be after startDate';
  }
}
