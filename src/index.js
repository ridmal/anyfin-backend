require('dotenv').config();
const express = require("express"); 
const got = require("got");
const app = express(); 
const {API_PORT, FIXER_API_KEY} = process.env; 
const { graphqlHTTP } = require('express-graphql');
const countrySchema = require('./schemas/countrySchema');
const cors = require('cors');
const isTokenValid = require('./validations/tokenValidation');
const expressPlayground = require('graphql-playground-middleware-express')
  .default;
const rateLimiter = require('./middlewares/rateLimitMiddleware');

app.all('*', (req, res, next) =>  {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const graphQLContext = req => {
  const { authorization: token } = req.headers;
  return {token};
};

const countryResolver = {
  countries: async (_, context) => {
    const { token } = context();
    const { error } = await isTokenValid(token);
    if (error) {
      throw new Error(error);
    }
    try{
      // we can move this to a service layer
      const countries = await got.get('https://restcountries.com/v3.1/all').json();
      if(countries.length){
        return countries.map((country, index)=>({
          id: index.toString(),
          name: country?.name?.official,
        }));
      }
    }
    catch(error){
      return error;
    }
  },
  country: async (countryItem, context) => {
    const { token } = context();
    const { error } = await isTokenValid(token);
    if (error) {
      throw new Error(error);
    }
    try{
      const response = await got.get(`https://restcountries.com/v3.1/name/${countryItem?.name}`).json();
      const country = response[0];
      const currency = Object.keys(country?.currencies)[0];
      const exchangeRate =  await got.get(
        {
          url: `https://api.apilayer.com/fixer/latest?base=${'SEK'}&symbols=${currency}`,
          headers: {
            apikey: FIXER_API_KEY
          }
        }
      ).json();
      if(country && exchangeRate?.success){
        return {
          name: country.name?.official,
          population:  country?.population,
          exchangeRate: exchangeRate?.rates?.[currency],
          currency: currency
        };
      }
      return {};
    }
    catch(error){
      return error;
    }
  },
};

app.use(rateLimiter);

app.use('/anyfin', cors(), graphqlHTTP(async req => ({
  schema: countrySchema,
  rootValue: countryResolver,
  graphiql: false,
  context: () => graphQLContext(req),
})));

app.get('/playground', expressPlayground({ endpoint: '/anyfin' }));

app.listen(API_PORT, () => {
  console.log(`Now listening on port ${API_PORT}`);
});

