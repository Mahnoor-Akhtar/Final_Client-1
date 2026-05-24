import { Teacher } from './models/index.js';
import { sequelize } from './db.js';

(async () => {
  try {
    await sequelize.authenticate();
    const count = await Teacher.countDocuments();
    console.log('Teacher count:', count);
    const teachers = await Teacher.find({});
    console.log('Teachers sample:', teachers.slice(0, 5));
  } catch (err) {
    console.error('Error checking teachers:', err);
  } finally {
    await sequelize.close();
  }
})();
