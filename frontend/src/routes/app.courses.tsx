import { createFileRoute } from "@tanstack/react-router";
import CoursesManager from "@/components/CoursesManager";

export const Route = createFileRoute("/app/courses")({ component: CoursesManager });
