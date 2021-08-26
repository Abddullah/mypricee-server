const app = require("./src/app");
// const { DB_URI } = require("./src/config");
const mongoose = require("mongoose");
let DB_URI = 'mongodb+srv://headeralishah:NpanOw6eSoCnsi8Z@cluster0.lrmmd.gcp.mongodb.net/mypricee-dev?retryWrites=true&w=majority'

mongoose.set('useCreateIndex', true);
mongoose.connect(DB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
})
    .then(() => console.log('<================================> DB  Connected <==================================>'))
    .catch(err => { console.log(`DB Connection Error: ${err}`); });

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`<======================> Product Server listening on port ${PORT} <======================>`);
});