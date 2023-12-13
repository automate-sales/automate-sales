export type TemplateObj = {
    name: string;
    body: string;
    variables: {
        [key:string]: string;
    }
}