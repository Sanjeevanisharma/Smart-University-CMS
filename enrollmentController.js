const asyncHandler = require('express-async-handler');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// GET /portal/my-courses
const getMyCourses = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const enrollments = await Enrollment.find({ user: userId, status: 'enrolled' })
    .populate({ path: 'course', populate: { path: 'department', select: 'name code' } })
    .sort({ createdAt: -1 });

  if (req.accepts('json')) return res.json(enrollments);
  res.render('portal/my-courses', { title: 'My Courses', enrollments });
});

// POST /portal/enroll { courseId }
const enrollInCourse = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course) {
    if (req.accepts('json')) return res.status(404).json({ message: 'Course not found' });
    req.flash('error', 'Course not found');
    return res.redirect('/catalog');
  }
  try {
    await Enrollment.create({ user: userId, course: courseId, status: 'enrolled' });
  } catch (err) {
    // Handle duplicate enrollment gracefully
    if (err && err.code === 11000) {
      if (req.accepts('json')) return res.json({ message: 'Already enrolled' });
      req.flash('success', 'Already enrolled');
      return res.redirect(`/catalog/course/${courseId}`);
    }
    throw err;
  }

  if (req.accepts('json')) return res.status(201).json({ message: 'Enrolled' });
  req.flash('success', 'Enrolled successfully');
  res.redirect(`/catalog/course/${courseId}`);
});

// POST /portal/drop { courseId }
const dropFromCourse = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const { courseId } = req.body;
  const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
  if (!enrollment) {
    if (req.accepts('json')) return res.status(404).json({ message: 'Enrollment not found' });
    req.flash('error', 'You are not enrolled in this course');
    return res.redirect(`/catalog/course/${courseId}`);
  }
  await enrollment.deleteOne();

  if (req.accepts('json')) return res.json({ message: 'Dropped' });
  req.flash('success', 'Dropped from course');
  res.redirect(`/catalog/course/${courseId}`);
});

module.exports = { getMyCourses, enrollInCourse, dropFromCourse };
