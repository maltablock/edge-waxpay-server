# edge-waxpay-server

# Endpoints

## POST `/api/v1/activateAccount`

Creates a free WAX account.

### Example

```bash
curl --header 'Content-Type: application/json' https://<baseUrl>/api/v1/activateAccount \
  --data '{
  "ownerPublicKey": "EOS6DBfLa7c9tgvUBb5LHCAKPG7J1TebFYkYW7sLPZXVhAWWm8zpn",
  "activePublicKey": "EOS6DBfLa7c9tgvUBb5LHCAKPG7J1TebFYkYW7sLPZXVhAWWm8zpn"
}'
```

### Parameters

- `ownerPublicKey`: The desired owner public key of the account to create
- `activePublicKey`: The desired active public key of the account to create

```ts
type RequestPayload = {
  ownerPublicKey: string;
  activePublicKey: string;
}
```

### Reponses

#### Success (200 OK)

On successful response the account creation transaction was successfuly submitted to the WAX blockchain.

- `accountName`: The 12-character WAX account name ending in `.phoenix` that was created in this request
- `ownerPublicKey`: Same as in the request
- `activePublicKey`: Same as in the request
- `transactionId`: The transaction ID of the account creation transaction

```ts
type SuccessResponse = {
  accountName: string;
  ownerPublicKey: string;
  activePublicKey: string;
  transactionId: string;
}
```

#### Failure (500)

Returns a JSON array of error objects:

```ts
type FailureResponse = {
  errorCode: string;
  message: string;
  data?: string;
}[]
```

# Resources

- https://github.com/EdgeApp/edge-currency-accountbased
- https://github.com/EdgeApp/edge-eospay-server