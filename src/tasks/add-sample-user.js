import uuid from 'uuid';
import { internet, name, random } from 'faker';
import { getGrpcClientAsync } from '../utils/grpc-client';
import { USER_MANAGEMENT_SERVICE } from '../services/user-management';
import { stringToUuid } from '../utils/protobuf-conversions';
import { getCassandraClient } from '../utils/cassandra';

/**
 * Adds a sample user.
 */
export async function addSampleUser() {
  // Generate a user and add using Grpc service
  let client = await getGrpcClientAsync(USER_MANAGEMENT_SERVICE);

  let userId = uuid.v4();
  let firstName = name.firstName();
  let lastName = name.lastName();
  let request = {
    userId: stringToUuid(userId),
    firstName,
    lastName,
    password: internet.password(random.number({ min: 7, max: 20 })),
    email: internet.exampleEmail(firstName, lastName)
  };
  await client.createUserAsync(request);

  // Save the User's Id so we can use it in other sample data
  let cass = getCassandraClient();
  await cass.executeAsync('INSERT INTO users (userid) VALUES (?)', [ userId ]);
};

export default addSampleUser;