import { createFileRoute } from "@tanstack/react-router";
import StudentsManager from "@/components/StudentsManager";

export const Route = createFileRoute("/app/students")({ component: StudentsManager });
