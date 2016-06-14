import { getGrpcClientAsync } from 'killrvideo-nodejs-common';
import { USER_MANAGEMENT_SERVICE } from '../services/user-management';

/**
 * Adds a sample user.
 */
export function addSampleUser() {
  return getGrpcClientAsync(USER_MANAGEMENT_SERVICE)
    .then(client => {
      throw new Error('Not implemented');
    });
};

export default addSampleUser;