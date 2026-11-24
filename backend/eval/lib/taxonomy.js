// The skill vocabulary the evaluation is scored against.
//
// Each canonical skill has aliases that appear in resume text ("JS",
// "Postgres", "k8s"). The generator renders random aliases into resumes; the
// scorer maps a model's output back to canonical names, so "JS" and
// "JavaScript" count as the same skill. This is the same idea the production
// skill-gap analysis needs (roadmap Phase 2: a real skill taxonomy), so this
// file is a starting point for it, not throwaway test data.
const SKILLS = {
  javascript: ['JavaScript', 'JS', 'ES6'],
  typescript: ['TypeScript', 'TS'],
  react: ['React', 'React.js', 'ReactJS'],
  'next.js': ['Next.js', 'NextJS'],
  redux: ['Redux'],
  vue: ['Vue', 'Vue.js'],
  angular: ['Angular'],
  html: ['HTML', 'HTML5'],
  css: ['CSS', 'CSS3'],
  'tailwind css': ['Tailwind CSS', 'Tailwind'],
  jest: ['Jest'],
  figma: ['Figma'],
  'node.js': ['Node.js', 'NodeJS', 'Node'],
  express: ['Express', 'Express.js'],
  'rest apis': ['REST APIs', 'RESTful APIs', 'REST'],
  graphql: ['GraphQL'],
  mongodb: ['MongoDB', 'Mongo'],
  postgresql: ['PostgreSQL', 'Postgres'],
  sql: ['SQL'],
  redis: ['Redis'],
  kafka: ['Kafka', 'Apache Kafka'],
  python: ['Python'],
  java: ['Java'],
  'spring boot': ['Spring Boot', 'Spring'],
  go: ['Golang'],
  docker: ['Docker'],
  kubernetes: ['Kubernetes', 'K8s'],
  aws: ['AWS', 'Amazon Web Services'],
  terraform: ['Terraform'],
  'ci/cd': ['CI/CD', 'CI-CD', 'continuous integration'],
  jenkins: ['Jenkins'],
  git: ['Git', 'GitHub'],
  linux: ['Linux'],
  pandas: ['Pandas'],
  numpy: ['NumPy'],
  'scikit-learn': ['scikit-learn', 'sklearn'],
  'machine learning': ['machine learning', 'ML'],
  'deep learning': ['deep learning'],
  pytorch: ['PyTorch'],
  tensorflow: ['TensorFlow'],
  nlp: ['NLP', 'natural language processing'],
  'computer vision': ['computer vision'],
  statistics: ['statistics', 'statistical modelling'],
  spark: ['Spark', 'Apache Spark'],
  airflow: ['Airflow', 'Apache Airflow'],
  tableau: ['Tableau'],
  'power bi': ['Power BI'],
  excel: ['Excel', 'Microsoft Excel'],
  selenium: ['Selenium'],
  kotlin: ['Kotlin'],
  swift: ['Swift'],
  flutter: ['Flutter'],
  firebase: ['Firebase'],
};

// alias (lowercased, punctuation-insensitive) -> canonical name.
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9+#]/g, '');
const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(SKILLS)) {
  ALIAS_TO_CANONICAL.set(norm(canonical), canonical);
  for (const alias of aliases) ALIAS_TO_CANONICAL.set(norm(alias), canonical);
}

// Maps any skill string to its canonical name; unknown strings pass through
// normalised, so a skill we do not know about can still match itself.
function canonicalSkill(name) {
  const key = norm(name);
  return ALIAS_TO_CANONICAL.get(key) || key;
}

module.exports = { SKILLS, canonicalSkill };
