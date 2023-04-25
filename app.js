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
