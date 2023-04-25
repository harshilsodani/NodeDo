/* This is a Node.js application using the Express framework and MongoDB database. It creates a to-do
list web application that allows users to add and delete items from a list. The code defines the
routes and functionality for the application, including rendering views using EJS, handling form
submissions, and interacting with the database using Mongoose. The application listens on port 3000
for incoming requests. */

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {
  useNewURLParser: true,
});

const itemSchema = new mongoose.Schema({
  name: { type: String, required: [true] },
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({
  name: "Welcome to your todolist!",
});

const item2 = new Item({
  name: "Hit + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = mongoose.Schema({
  name: String,
  items: [itemSchema],
});

const List = mongoose.model("List", listSchema);

/* This code defines a route for the root URL ("/") of the web application. When a GET request is made
to this URL, it first uses the `Item` model to find all items in the database. If no items are
found, it inserts the default items defined earlier in the code. If items are found, it renders the
"list" view using EJS and passes in the found items as an array to be displayed on the page. The
`async` keyword is used to indicate that the function contains asynchronous code that may take some
time to complete, and the `await` keyword is used to wait for the `Item.find()` method to complete
before moving on to the next step. */
app.get("/", async function (req, res) {
  const foundItems = await Item.find({});

  try {
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems)
        .then(() => {
          console.log("Inserted default items successfully");
        })
        .catch((err) => {
          console.log(err);
        });

      res.redirect("/");
    } else {
      console.log(foundItems);
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  } catch (err) {
    console.log(err);
  }
});

/* This code defines a route for a custom list name in the URL ("/:customListName"). When a GET request
is made to this URL, it first capitalizes the custom list name parameter using the Lodash library.
If the custom list name is "favicon.ico", it returns and does not execute the rest of the code.
Otherwise, it uses the `List` model to find a list in the database with the same name as the custom
list name. If no list is found, it creates a new list with the custom list name and default items,
saves it to the database, and redirects to the new list's URL. If a list is found, it renders the
"list" view using EJS and passes in the found list's name and items as an object to be displayed on
the page. The `async` keyword is used to indicate that the function contains asynchronous code that
may take some time to complete, and the `await` keyword is used to wait for the `List.findOne()` and
`list.save()` methods to complete before moving on to the next step. */
app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  if (req.params.customListName === "favicon.ico") {
    return;
  }

  try {
    const foundList = await List.findOne({ name: customListName });
    if (!foundList) {
      // create a new list
      const list = new List({
        name: customListName,
        items: defaultItems,
      });

      await list.save();
      res.redirect("/" + customListName);
    } else {
      // show existing list
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  } catch (error) {
    console.log(err);
  }
});

/* This code defines a route for handling form submissions when a user adds a new item to the to-do
list. It uses the HTTP POST method and listens for requests to the root URL ("/"). When a POST
request is made, it retrieves the values of the "newItem" and "list" fields from the request body
using `req.body`. It then creates a new `Item` object with the name set to the value of "newItem".
If the value of "list" is "Today", it saves the new item to the database and redirects the user back
to the root URL ("/"). If the value of "list" is not "Today", it uses the `List` model to find the
list with the same name as the value of "list". It then adds the new item to the list's "items"
array and saves the list to the database. Finally, it redirects the user to the URL for the custom
list. If there is an error during the process, it logs the error to the console. */
app.post("/", async function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  if (!itemName) {
    return res.status(400), send("Item name is required");
  }

  const item = new Item({
    name: itemName,
  });

  try {
    if (listName === "Today") {
      item.save();
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      foundList.items.push(item);
      await foundList.save();
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.log(err);
  }
});

/* This code defines a route for handling form submissions when a user deletes an item from the to-do
list. It uses the HTTP POST method and listens for requests to the "/delete" URL. When a POST
request is made, it retrieves the values of the "checkbox" and "listName" fields from the request
body using `req.body`. If the value of "listName" is "Today", it uses the `Item` model to find the
item with the same ID as the value of "checkbox" and deletes it from the database. If the value of
"listName" is not "Today", it uses the `List` model to find the list with the same name as the value
of "listName". It then removes the item with the same ID as the value of "checkbox" from the list's
"items" array and saves the list to the database. Finally, it redirects the user back to the root
URL ("/") or the URL for the custom list, depending on the value of "listName". If there is an error
during the process, it logs the error to the console. */
app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    try {
      await Item.findByIdAndDelete(checkedItemId);
      console.log("Item successfully removed");
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } else {
    try {
      let foundList = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } },
        { new: true }
      );
      res.redirect("/" + listName);
    } catch (err) {
      console.log(err);
    }
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
