export type TemplateObj = {
    name: string;
    body: string;
    variables: string[];
}

export type UserObj = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id?: string | null;
}
