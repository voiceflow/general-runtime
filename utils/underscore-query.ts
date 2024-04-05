import _ from 'lodash';
import lodashModifier from 'underscore-query';

lodashModifier(_);

// !TODO! - There must be a better way to type this.
const query = <T>(collection: T[], criteria: Record<string, any>): T[] => (_ as any).query(collection, criteria);

export default query;
