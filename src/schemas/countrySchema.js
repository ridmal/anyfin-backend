const { buildSchema } = require('graphql');

const countrySchema = buildSchema(`
    type Country {
        id: String
        name: String
    }

    type CountryDetail {
        name: String
        population: Int
        exchangeRate: Float
        currency: String
    }

    type Query {
        countries: [Country]
        country(name: String): CountryDetail
    }
`);

module.exports = countrySchema;
