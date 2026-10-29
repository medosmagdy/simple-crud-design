import User from "../Models/user.model.js";
import { BaseRepository } from "./base.repository.js";
export default class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }
  findUserByEmail(email, projection = null) {
    return this.findOneDocument({ email }, projection);
  }
}
