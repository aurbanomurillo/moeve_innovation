# Optimización de las Paradas de Mantenimiento

Cada componente de un parque debe ser parado para revisión y mantenimiento periódicamente. Dichas paradas suponen una pérdida de producción, por lo que es crucial optimizarlas. Además, las paradas de mantenimiento suelen suponer introducir muchas personas distintas (cuadriplicando la cantidad de personas que normalmente trabajan en el parque), personas que pueden no tener una misma cultura de empresa. Dichas personas, en el statu quo, no tienen una comunicación efectiva y fluida entre sí.

Además, si bien las refinerías solo operan alrededor de un 5% del tiempo en modo parada, ese periodo concentra el 50% de los incidentes de riesgo laboral.

## Statu Quo

Hay reuniones diarias de coordinación, pero no hay una herramienta que permita a todas las partes involucradas (operadores, técnicos de mantenimiento, proveedores externos, etc.) tener una visión clara y actualizada del estado del parque y de las tareas que se están realizando.

## Idea

Un modelo que sea capaz de asignar, en tiempo real, las tareas a cada persona involucrada en la parada de mantenimiento, teniendo en cuenta sus habilidades, experiencia y disponibilidad, así como el estado actual del parque y las tareas que se están realizando. De esta forma, implementando una suerte de calendario dinámico, se podría optimizar la asignación de tareas. Además, cada trabajador tendría la facilidad de conocer en todo momento qué tareas se están realizando, quién las está realizando y cuál es el estado de cada tarea, sin necesidad de tener reuniones constantes para coordinarse. Esto no sólo optimizaría la parada de mantenimiento, sino que también reduciría el estrés de los trabajadores al tener una visión clara y actualizada de lo que está sucediendo en el parque.

De esta forma cada contratista, en vez de llegar ciego al riesgo del día (habiendo recibido información genérica sobre seguridad), obtiene información contextual y específica a su tarea, lo que le permite prepararse mejor y reducir el riesgo de accidentes. Además, al tener una visión clara de las tareas que se están realizando y quién las está realizando, se mejora la coordinación entre los diferentes equipos y se reduce el riesgo de errores o malentendidos que podrían llevar a accidentes.

Por último, supone una mejora significativa en el uso de datos derivados de Near Misses e incidentes. Actualmente, no es trivial asignar responsabilidades o causas a los incidentes, lo que dificulta la implementación de medidas preventivas efectivas. Con esta herramienta, se podría analizar cada incidente en detalle, identificando las tareas y personas involucradas, y utilizando esta información para mejorar la planificación de futuras paradas de mantenimiento y reducir el riesgo de accidentes.

## Limitaciones principales

- **Complejidad de la planificación en tiempo real**: Los parones mayores suelen estar condicionados por miles de variables: ventanas de seguridad, dependencias técnicas entre tareas, disponibilidad de recursos, etc.
- **Carga de uso para trabajadores externos**: Depende, para su correcto funcionamiento, de que todos los contratistas y trabajadores externos utilicen y sean capaces de manejar la herramienta de manera efectiva, lo que podría suponer una barrera de entrada y generar resistencia por parte de algunos trabajadores.
- **Foco difuso en seguridad**: Si bien la reducción de estrés y la mejora de la coordinación son objetivos del programa, parece atacar más a la eficiencia operativa que a la seguridad laboral, por lo que es importante asegurarse de que la herramienta también incluya funcionalidades específicas para mejorar la seguridad, como alertas de riesgos, protocolos de emergencia, etc.

## Mitigación de Limitaciones

- **Uso de tecnologías existentes**: MOEVE usa una plataforma actualmente, _Enablon_, como sistema de Control of Work. Si bien es una herramienta que cumple su propósito básico, no permite a los trabajadores tener una visión clara de las actividades relacionadas, horarios solapados... No existe un entorno de información totalmente integrado; el sistema sabe que ha dado el permiso A en la zona B-12, pero no conoce si las personas a las que está asignado dicho permiso se encuentran en las premisas, si han leído el permiso, si hay otras personas trabajando en la zona, etc. De esta forma, una primera fase de este proyecto podría centrarse en mejorar la plataforma existente, integrando funcionalidades que permitan a los trabajadores tener una visión clara y actualizada del estado del parque y de las tareas que se están realizando, sin necesidad de crear una herramienta completamente nueva desde cero.
