/**
 * Chuyen du lieu (lean object cua Mongoose) sang JSON tra ve cho client.
 * Khong bao gio tra ve passwordHash.
 */

function idOf(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

/** Thong tin cong khai cua nguoi dung (dung khi hien thi trong cong viec, tim kiem). */
function publicUser(user) {
  if (!user) return null;
  if (user.fullName === undefined) return { id: idOf(user) };
  return {
    id: idOf(user),
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
  };
}

/** Thong tin day du cua chinh nguoi dung dang dang nhap. */
function privateUser(user) {
  return {
    ...publicUser(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = { idOf, publicUser, privateUser };
