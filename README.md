# Deploy to Salesforce DX

An open-source and community-driven tool for one-click Salesforce DX deployments from public repositories to Scratch Orgs. You can us this tool by visiting [https://deploy-to-sfdx.com/](https://deploy-to-sfdx.com/) and logging in with your Dev Hub credentials.

## Local Setup

You'll need the following setup to run this project locally.

1. Create a Salesforce DX Dev Hub. You can learn more [here](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_enable_devhub.htm).

2. Install the Salesforce CLI from [here](https://developer.salesforce.com/tools/sfdxcli).

3. Create a Connected App in your Dev Hub.

    - Callback: https://localhost:8443/oauth/callback
    - Scopes

        - Access your basic information (id, profile, email, address, phone)
        - Access and manage your data (api)
        - Provide access to your data via the Web (web)
        - Allow access to your unique identifier (openid)

    - Note down the consumer key and consumer secret for later.

4. Create a Postgres database in Heroku.

5. Create the `deployments` and `deployment_steps` tables by running the `deployments.sql` script against your Postgres database.

6. Create a `.env` file to store your local environment settings.

7. Update your `.env` file to include the following

```
BUILDPACK_URL=https://github.com/wadewegner/sfdx-buildpack
CALLBACKURL=https://localhost:8443/oauth/callback
CLI_PATH=
CONSUMERKEY=[your_consumer_key]
CONSUMERSECRET=[your_consumer_secret]
STARTINGDIRECTORY=cd tmp/;
PORT=8443
NODE_ENV=dev
DATABASE_URL=
PASS_PHRASE=
CERT_PEM=
KEY_PEM=
```

8. Get your Postgres `DATABASE_URL` by running `heroku config:get DATABASE_URL --app deploy-to-sfdx` and update.

9. Create your own local certificates or use these defaults:

```
PASS_PHRASE=test1234
CERT_PEM=-----BEGIN CERTIFICATE-----\nMIIDtTCCAp2gAwIBAgIJAIC3Ts6WBYTlMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV\nBAYTAkFVMRMwEQYDVQQIEwpTb21lLVN0YXRlMSEwHwYDVQQKExhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMTcwOTEwMDExODQ4WhcNMTgwOTEwMDExODQ4WjBF\nMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\nCgKCAQEAqMnT1RxpfKvc8HB8IoWMH1HSlsFyAw7Vg8I5xao6MfaydO3/C5Dw+i0P\n/CMmWdHSbhk/bOB+0FFHNYo0UOhMaxSouE+U9VHa2HZnwxvcOTJwT5NdRbPiIdkJ\n6G9CTfxe8KJV7vNlZ/ig1tZjSe/4MW5pg57d47o/Kg2YDgyeZTuR1zsxlwlR0LZS\nUhkrqG5JI8ouI7iTwdl3g3HAMV4k5AW2ox9UmAbXnvOt0DWWExcWkysYVnJ98wXs\nIv91nFFiz+P8MPhQ8EIyujerHuqZ2G2id2Wo6hVHG0o1ja4klI3F/xgcyw3CrXSD\nQcZO/CZ1nIJAffAvwaPqCY8/N9UofwIDAQABo4GnMIGkMB0GA1UdDgQWBBQ+xRiZ\nvg4qd18XG4Ivi2VEwSt3tjB1BgNVHSMEbjBsgBQ+xRiZvg4qd18XG4Ivi2VEwSt3\ntqFJpEcwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3RhdGUxITAfBgNV\nBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZIIJAIC3Ts6WBYTlMAwGA1UdEwQF\nMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBACPWZRPN6iAdWkAaU/FTeD4uMsw9N+Jw\npeYGNk0GVLoIXYCkr7W/X0Zoz27kqb2/QiZiKkuH2PD+VOGgKrerzQ6HFpPYEUgN\nCGNjGe6lug7o6tDGQTqD2U0YM0XS8s3nkT172NmXi/ZtAdS7qMOnO4UdD3HdOzRN\nrDVDUVtZcbC5T6iRzQ35XZgmBj+3uRq6cOOt+W8HKgu70hKPILj4k/05jfnvwXQ4\nwesGND5BgYvunr1RqdcNxKm4rqMYOC6wnz16lRAYsT33CJsd4tc7jIxX4HzOKnVI\nrNoL90NA1mU2v6jSoYCNcwvnRwZgfFhjYAxROGDSjNI2bDDXRji2Lt8=\n-----END CERTIFICATE-----\n
KEY_PEM=-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: DES-EDE3-CBC,87779AB98C3E6E95\n\niA6Uc2F53GxcFMCr+Lo9y82aflMu4YeEHgUYuzFcfAvhky0GIx3Mn2IrYYHzhzkc\n+pCOLAsclhFCHhh0jOftFIXXDc2dhO/tef/IMYOozk2Qz0mMf9Ee89k5LYEFr7/o\npnov4NxIrsw70oMeXCe89HRGMfYcjQMlkD7E1OV3G+SoCefw4uzJChssz21KdMdN\n5O1GaA5s+P1U37E/ilaSfYKUksiW2T27mtv1LelhUgeYmc9E+WyV6f7FZosD0mnU\nzHmvGgHDRJJ84v3UiPJ2Kui6ELRhhyzYkYm4yhPWsNUy9R6iaSCXWibM99ME5eMl\n3horfx5/5BaXBmnpN4pnf4pIE+xO/JUSD0cl13yHJzs1ALW8XhSmEp+sPAeTYIDn\nhHDh8AXyxwQe0BPQWyhn/1a4Fcv7BRIBwmQiTvuieq0teE62PUwlQr3eU+mg2p1w\nnnM2E7dm4rEUoyR/kxKUmpS1uvw8+SauzWnrv7ooRPbcIBuqMLpGJpK7cNzwWFhA\nHAtwWy804i4vgopekBI83pFQOOwMc4I/qYHEiyRE3EHuNiEam4R3q6czE61wGNVT\ntbt4kD8cVHtIx1+pUQjSZBpo1iTIOpm86SCytEitzLIPl600kD1LUo6AL4LsI9WD\nN275OBau/FuD+PN4nlKpRzj89XSecoRsOrLmJzLdQUgwoDW62mAKgWx8tt4zTV8W\n4OuK2jPZyN72dxD6LbHdLgKGE+J9XWFeNRj/1OxJj83AylS+nH6HOvtTOsPjiaUT\nJil+ixfeEB6/TcbQ2DWFY8xJ0QkhuTLr+aqJTKKImt+HmtgpexqO5gbuybDVLcG4\nwC25ZSy9WJxgaK1OwczpodHs4z6QDw6NAZDa+wbGyH7rXu04CJHeeSuAlhWpMmtX\n8jLHPmqU1m8ctkhO4n/z6lFnxmMx3VJlNBunJodkzH9GaEt9no3OdPT62TczFyYy\nJf89noStmXbV/DK3EFzGL77w8estQKHAtsuZcXeAnd7dLOhs5+hzR2q6MW8h6nQm\nO1w7YgheBjHY2f+Kte+DJdQCp1IssYzjBq6dVlFu4Qw35vHMjlBYnnLXjB8pyPIA\n35cNGNY580dP96VNmDFGklxZQGLi2W/f4GzcSPQLcflRUJZ8YJT3pAOO1n4ATaUU\nTNN4OnwqYbrU91+pkDJPIZSoEEZErTWRMO9oTgCK68mE1NanXnMOVpgMiheq5POj\nzs8Q6HDS4XMr+prbsvXNC3GKkVLDQOSUc6wMbF9nOu3fUXgr/LOfZGBagkktP6FE\ntU0w+8PA2CUm6s4zCbW/5O0BkC4nvxTfSj5i+FVbT9gbuHjFldyoqTvzaODrcHF4\ncAId/HwdyqvE2i4jeauotyaazJZxea3rGNS0Rjum/0BHivGiPZyPb01M4HiRz2ll\ndhD7fC6O8sSxswSU6b+F5D8w8BCg7u8dX2iXXM4FEyBtvdOfFtRj6p/uKsqol3Pu\nLwt5guvYlEJOA68VnrfofFaKHqygoN7bklOhU6qoBKxdpTAve8zLTwDWymR10ZF1\nPu7NqPrcnesVuhpvylInLg1c5ccuZmsr/FwEi9C83bGMVxUXLBFUZSCEiRsmfR0F\n-----END RSA PRIVATE KEY-----\n
```

## Run Locally

Once you have the above setup correctly, you can run by running `heroku local` and then browsing to [https://localhost:8443/](https://localhost:8443/).

## Updating SCSS or UX assets

If you make changes to SCSS or UX assets, be sure you regenerate the `dist` files by running the command `npm run css-build`.
