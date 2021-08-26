const app = require("./src/app");
const { DB_URI } = require("./src/config");
const mongoose = require("mongoose");

mongoose.connect(DB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
})
    .then(() => console.log('<================================> DB  Connected <==================================>'))
    .catch(err => { console.log(`DB Connection Error: ${err}`); });


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`<======================> Scrapper Server listening on port ${PORT} <======================>`);
});