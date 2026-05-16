/**
 * Base service for generic CRUD operations
 */
class BaseService {
  constructor(model) {
    this.model = model;
  }

  async getAll(query = {}, options = {}) {
    return await this.model.findAll({
      where: query,
      ...options
    });
  }

  async getById(id, options = {}) {
    const record = await this.model.findByPk(id, options);
    if (!record) {
      const error = new Error(`${this.model.name} not found`);
      error.status = 404;
      throw error;
    }
    return record;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async update(id, data) {
    const record = await this.getById(id);
    return await record.update(data);
  }

  async delete(id) {
    const record = await this.getById(id);
    await record.destroy();
    return { message: `${this.model.name} deleted successfully` };
  }
}

module.exports = BaseService;
