class Repository {
  constructor(model) {
    this.model = model;
  }
  findOne(filter, select) {
    const query = this.model.findOne(filter);
    return select ? query.select(select) : query;
  }
  findById(id, select) {
    const query = this.model.findById(id);
    return select ? query.select(select) : query;
  }
  create(data) {
    return this.model.create(data);
  }
  updateOne(filter, data) {
    return this.model.findOneAndUpdate(
      filter,
      { $set: data },
      { new: true, runValidators: true },
    );
  }
  deleteOne(filter) {
    return this.model.findOneAndDelete(filter);
  }
}
module.exports = { Repository };
