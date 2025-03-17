const awsconfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
    mandatorySignIn: true,
    oauth: {
      domain: `auth.${process.env.REACT_APP_DOMAIN || 'live-translate.org'}`,
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: process.env.REACT_APP_DOMAIN ? `https://${process.env.REACT_APP_DOMAIN}` : 'http://localhost:3000',
      redirectSignOut: process.env.REACT_APP_DOMAIN ? `https://${process.env.REACT_APP_DOMAIN}` : 'http://localhost:3000',
      responseType: 'code'
    },
    federationTarget: 'COGNITO_USER_POOLS',
    cookieStorage: {
      domain: process.env.REACT_APP_DOMAIN || 'localhost',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: 365
    }
  },
  API: {
    endpoints: [
      {
        name: "livetranslateAPI",
        endpoint: process.env.REACT_APP_API_URL || "https://api.live-translate.org"
      }
    ]
  }
};

export default awsconfig;
