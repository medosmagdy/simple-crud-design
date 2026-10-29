import { isValidObjectId } from "mongoose";
import { BadRequestException } from "../../Common/Utils/Errors/exceptions.error.js";
export class BaseRepository {
  constructor(model) {
    this.model = model;
  }
  createDocument(data) {
    return this.model.create(data);
  }
  findOneDocument(filters = {}, projection = null) {
    return this.model.findOne(filters).select(projection);
  }
  findDocumentById(id, projection = null) {
    if (!isValidObjectId(id))
      throw new BadRequestException("Invalid object ID");
    return this.model.findById(id).select(projection);
  }
  updateDocumentById(id, data, options = {}) {
    if (!isValidObjectId(id))
      throw new BadRequestException("Invalid object ID");
    return this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      ...options,
    });
  }
  updateOneDocument(filters, data, options = {}) {
    return this.model.findOneAndUpdate(filters, data, {
      new: true,
      runValidators: true,
      ...options,
    });
  }
  deleteOneDocument(filters) {
    return this.model.findOneAndDelete(filters);
  }
}
