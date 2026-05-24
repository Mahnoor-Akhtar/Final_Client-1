<?php
namespace App;

use App\Models\Notification;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Course;
use App\Models\FypGroup;

class NotificationService {
    public static function createAndEmitNotification($table, $action, $payload, $doc) {
        $send = function($userIdOrEmail, $title, $message) {
            if (!$userIdOrEmail) return;
            $notif = Notification::create([
                'user_id' => $userIdOrEmail,
                'title'   => $title,
                'message' => $message,
                'read'    => false,
            ]);
            
            SocketBridge::emit(strtolower($userIdOrEmail), 'notification', $notif);
            SocketBridge::emit($userIdOrEmail, 'notification', $notif);
        };

        $sendToAdmin = function($title, $message) use ($send) {
            $send('admin', $title, $message);
            $send('admin@college.edu', $title, $message);
        };

        try {
            if ($action === 'create') {
                if ($table === 'attendance') {
                    $studentId = $doc['student_id'] ?? null;
                    $courseId = $doc['course_id'] ?? null;
                    $status = $doc['status'] ?? 'present';
                    $date = $doc['date'] ?? '';

                    if ($status === 'absent' || $status === 'late') {
                        $student = Student::find($studentId);
                        $course = Course::find($courseId);
                        $courseName = $course ? $course->title : 'Course';
                        $email = $student ? $student->email : $studentId;

                        $send(
                            $email,
                            "Attendance Alert",
                            "You were marked {$status} in {$courseName} on {$date}."
                        );
                    }
                }
                else if ($table === 'fyp_submissions') {
                    $groupId = $doc['group_id'] ?? null;
                    $title = $doc['title'] ?? '';
                    $group = FypGroup::find($groupId);
                    if ($group) {
                        $groupName = $group->group_name;
                        $supervisorId = $group->supervisor_id;
                        $supervisor = Teacher::find($supervisorId);
                        $supervisorEmail = $supervisor ? $supervisor->email : $supervisorId;

                        $send(
                            $supervisorEmail,
                            "New FYP Deliverable Submitted",
                            "Group \"{$groupName}\" has submitted: \"{$title}\"."
                        );
                    }
                }
                else if ($table === 'fyp_groups') {
                    $groupName = $doc['group_name'] ?? '';
                    $title = $doc['title'] ?? '';
                    $supervisorId = $doc['supervisor_id'] ?? null;
                    $members = $doc['members'] ?? [];

                    // 1. Notify supervisor teacher
                    $supervisor = Teacher::find($supervisorId);
                    if ($supervisor) {
                        $send(
                            $supervisor->email,
                            "New FYP Supervision Request",
                            "Group \"{$groupName}\" has requested you as supervisor for their project \"{$title}\"."
                        );
                    }
                    // 2. Notify student members
                    if (!empty($members) && is_array($members)) {
                        foreach ($members as $mId) {
                            $student = Student::find($mId);
                            if ($student) {
                                $send(
                                    $student->email,
                                    "FYP Request Registered",
                                    "Your FYP group request for \"{$title}\" has been successfully submitted and is awaiting supervisor approval."
                                );
                            }
                        }
                    }
                }
                else if ($table === 'fees') {
                    $studentId = $doc['student_id'] ?? null;
                    $title = $doc['title'] ?? '';
                    $amount = $doc['amount'] ?? 0;
                    $dueDate = $doc['due_date'] ?? '';

                    $student = Student::find($studentId);
                    if ($student) {
                        $send(
                            $student->email,
                            "New Fee Invoice Issued",
                            "An invoice of Rs. {$amount} for \"{$title}\" has been issued. Please clear it by {$dueDate}."
                        );
                    }
                }
                else if ($table === 'complaints') {
                    $studentId = $doc['student_id'] ?? null;
                    $title = $doc['title'] ?? '';
                    $student = Student::find($studentId);
                    $studentName = $student ? $student->full_name : 'A student';

                    $sendToAdmin(
                        "New Complaint Filed",
                        "{$studentName} filed a complaint: \"{$title}\"."
                    );
                }
            }
            else if ($action === 'update') {
                if ($table === 'fyp_groups') {
                    $status = $doc['status'] ?? 'pending';
                    $groupName = $doc['group_name'] ?? '';
                    $members = $doc['members'] ?? [];

                    if (!empty($members) && is_array($members)) {
                        foreach ($members as $mId) {
                            $student = Student::find($mId);
                            $studentEmail = $student ? $student->email : $mId;
                            $send(
                                $studentEmail,
                                "FYP Group Status Updated",
                                "Your group \"{$groupName}\" application has been {$status}."
                            );
                        }
                    }
                }
                else if ($table === 'fyp_submissions') {
                    $groupId = $doc['group_id'] ?? null;
                    $title = $doc['title'] ?? '';
                    $grade = $doc['grade'] ?? '';
                    $comments = $doc['comments'] ?? 'None';

                    $group = FypGroup::find($groupId);
                    if ($group && !empty($group->members) && is_array($group->members)) {
                        foreach ($group->members as $mId) {
                            $student = Student::find($mId);
                            $studentEmail = $student ? $student->email : $mId;
                            $send(
                                $studentEmail,
                                "FYP Deliverable Graded",
                                "Your deliverable \"{$title}\" has been graded: \"{$grade}\". Remarks: {$comments}"
                            );
                        }
                    }
                }
                else if ($table === 'complaints') {
                    $studentId = $doc['student_id'] ?? null;
                    $title = $doc['title'] ?? '';
                    $reply = $doc['reply'] ?? 'No reply text provided.';
                    $status = $doc['status'] ?? 'pending';

                    $student = Student::find($studentId);
                    $studentEmail = $student ? $student->email : $studentId;

                    $send(
                        $studentEmail,
                        "Complaint Status Updated",
                        "Your complaint \"{$title}\" is now {$status}. Reply: \"{$reply}\""
                    );
                }
                else if ($table === 'fees') {
                    $studentId = $doc['student_id'] ?? null;
                    $title = $doc['title'] ?? '';
                    $amount = $doc['amount'] ?? 0;
                    $status = $doc['status'] ?? 'pending';
                    $method = $doc['method'] ?? 'online';

                    if ($status === 'paid') {
                        $student = Student::find($studentId);
                        $studentEmail = $student ? $student->email : $studentId;
                        $studentName = $student ? $student->full_name : 'A student';

                        $send(
                            $studentEmail,
                            "Fee Payment Confirmed",
                            "Payment of Rs. {$amount} for \"{$title}\" via {$method} has been verified."
                        );

                        $sendToAdmin(
                            "Fee Payment Received",
                            "{$studentName} (" . ($student ? $student->roll_number : $studentId) . ") paid Rs. {$amount} for \"{$title}\" via {$method}."
                        );
                    }
                }
            }
        } catch (\Exception $e) {
            error_log("NotificationService error: " . $e->getMessage());
        }
    }
}
